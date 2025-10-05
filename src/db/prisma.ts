// Prisma compatibility adapter using Supabase client and pg for raw.
// This is a best-effort shim to keep existing calls working while migrating off Prisma.
import { supabase } from './supabase';
import { query as pgQuery } from './pool';

type Where = Record<string, any>;

const modelToTable: Record<string, string> = {
  user: 'Users',
  balance: 'Balances',
  wallet: 'Wallets',
  transaction: 'Transactions',
  bet: 'Bets',
  log: 'Logs',
  hashGameConfig: 'HashGameConfigs',
  gameSettings: 'GameSettings',
  payout: 'Payouts',
  game: 'Games',
  tempGame: 'TempGames',
  withdrawRequest: 'WithdrawRequests',
  product: 'Product',
  emailVerificationCode: 'EmailVerificationCodes',
};

function applyWhere(q: any, where?: Where) {
  if (!where) return q;
  // Handle OR compound
  if (Array.isArray(where.OR)) {
    const parts: string[] = [];
    for (const cond of where.OR) {
      for (const key of Object.keys(cond)) {
        const val = cond[key];
        if (typeof val === 'object' && val && 'contains' in val) {
          const txt = `%${val.contains}%`;
          parts.push(`${key}.ilike.${txt}`);
        } else if (typeof val === 'object' && val && 'equals' in val) {
          parts.push(`${key}.eq.${val.equals}`);
        } else if (typeof val === 'object' && val && ('gte' in val || 'lte' in val || 'gt' in val || 'lt' in val)) {
          if ('gte' in val) parts.push(`${key}.gte.${val.gte}`);
          if ('lte' in val) parts.push(`${key}.lte.${val.lte}`);
          if ('gt' in val) parts.push(`${key}.gt.${val.gt}`);
          if ('lt' in val) parts.push(`${key}.lt.${val.lt}`);
        } else {
          parts.push(`${key}.eq.${val}`);
        }
      }
    }
    if (parts.length) q = q.or(parts.join(','));
  }
  for (const key of Object.keys(where)) {
    if (key === 'OR') continue;
    const val = where[key];
    if (val && typeof val === 'object' && 'in' in val) {
      q = q.in(key, val.in);
    } else if (val && typeof val === 'object' && ('gte' in val || 'lte' in val || 'gt' in val || 'lt' in val || 'equals' in val)) {
      if ('equals' in val) q = q.eq(key, val.equals);
      if ('gte' in val) q = q.gte(key, val.gte);
      if ('lte' in val) q = q.lte(key, val.lte);
      if ('gt' in val) q = q.gt(key, val.gt);
      if ('lt' in val) q = q.lt(key, val.lt);
    } else if (key.includes('_')) {
      // Composite unique like userId_currency
      const obj = where[key];
      if (obj && typeof obj === 'object') {
        for (const subKey of Object.keys(obj)) {
          q = q.eq(subKey, obj[subKey]);
        }
      }
    } else if (val && typeof val === 'object' && 'contains' in val) {
      const txt = `%${val.contains}%`;
      q = q.ilike(key, txt);
    } else {
      q = q.eq(key, val);
    }
  }
  return q;
}

function applyOrderSkipTake(q: any, orderBy?: any, skip?: number, take?: number) {
  if (orderBy && typeof orderBy === 'object') {
    const col = Object.keys(orderBy)[0];
    const dir = orderBy[col] === 'desc' ? { ascending: false } : { ascending: true };
    q = q.order(col, dir);
  }
  if (typeof skip === 'number' || typeof take === 'number') {
    const from = skip || 0;
    const to = (skip || 0) + (take ? take - 1 : 999999);
    q = q.range(from, to);
  }
  return q;
}

// Map camelCase fields used in code to actual DB columns for specific models
function remapKeyForModel(model: string, key: string): string {
  if (model === 'emailVerificationCode') {
    if (key === 'expiresAt') return 'expires_at';
    if (key === 'createdAt') return 'created_at';
  }
  return key;
}

function remapObjectKeysForModel(model: string, obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  const output: any = Array.isArray(obj) ? [] : {};
  for (const k of Object.keys(obj)) {
    const v = obj[k];
    const newKey = remapKeyForModel(model, k);
    output[newKey] = v;
  }
  return output;
}

function remapWhereForModel(model: string, where?: any): any {
  if (!where || typeof where !== 'object') return where;
  const out: any = {};
  for (const k of Object.keys(where)) {
    if (k === 'OR' && Array.isArray(where[k])) {
      out.OR = where[k].map((cond: any) => remapWhereForModel(model, cond));
      continue;
    }
    const newKey = remapKeyForModel(model, k);
    const val = where[k];
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      out[newKey] = { ...val };
    } else {
      out[newKey] = val;
    }
  }
  return out;
}

function tableApi(model: string) {
  const table = modelToTable[model];
  return {
    async findMany(args: any = {}) {
      let q = supabase.from(table).select(args.select ? Object.keys(args.select).join(',') : '*');
      const remappedWhere = remapWhereForModel(model, args.where);
      q = applyWhere(q, remappedWhere);
      q = applyOrderSkipTake(q, args.orderBy, args.skip, args.take);
      const { data, error } = await q;
      if (error) throw error;
      return data as any[];
    },
    async findFirst(args: any = {}) { const rows = await this.findMany({ ...args, take: 1 }); return rows[0] || null; },
    async findUnique(args: any = {}) {
      const rows = await this.findMany({ where: args.where, take: 1 });
      return rows[0] || null;
    },
    async count(args: any = {}) {
      let q = supabase.from(table).select('*', { count: 'exact', head: true });
      const remappedWhere = remapWhereForModel(model, args.where);
      q = applyWhere(q, remappedWhere);
      const { count, error } = await q;
      if (error) throw error;
      return count || 0;
    },
    async aggregate(args: any = {}) {
      // Minimal: only _sum supported with single column
      if (args._sum) {
        const col = Object.keys(args._sum)[0];
        let q = supabase.from(table).select(`${col}`);
        q = applyWhere(q, args.where);
        const { data, error } = await q;
        if (error) throw error;
        const sum = (data || []).reduce((acc: number, r: any) => acc + Number(r[col] || 0), 0);
        return { _sum: { [col]: sum } } as any;
      }
      return {} as any;
    },
    async create(args: any) {
      const dataToInsert = remapObjectKeysForModel(model, args.data);
      const { data, error } = await supabase.from(table).insert(dataToInsert).select('*').single();
      if (error) throw error;
      return data;
    },
    async createMany(args: any) {
      const dataToInsert = Array.isArray(args.data)
        ? args.data.map((d: any) => remapObjectKeysForModel(model, d))
        : remapObjectKeysForModel(model, args.data);
      const { error } = await supabase.from(table).insert(dataToInsert);
      if (error) throw error;
      return { count: (args.data || []).length } as any;
    },
    async update(args: any) {
      let q = supabase.from(table).update(args.data);
      const remappedWhere = remapWhereForModel(model, args.where);
      q = applyWhere(q, remappedWhere);
      const { data, error } = await q.select('*').single();
      if (error) throw error;
      return data;
    },
    async updateMany(args: any) {
      let q = supabase.from(table).update(args.data);
      const remappedWhere = remapWhereForModel(model, args.where);
      q = applyWhere(q, remappedWhere);
      const { error } = await q;
      if (error) throw error;
      return { count: 1 } as any;
    },
    async delete(args: any) {
      let q = supabase.from(table).delete();
      const remappedWhere = remapWhereForModel(model, args.where);
      q = applyWhere(q, remappedWhere);
      const { data, error } = await q.select('*').single();
      if (error) throw error;
      return data;
    },
    async upsert(args: any) {
      const existing = await this.findUnique({ where: args.where });
      if (existing) {
        return this.update({ where: args.where, data: args.update });
      }
      return this.create({ data: args.create });
    },
  };
}

const prismaCompat: any = {
  $queryRawUnsafe: async (sql: string, ...params: any[]) => {
    const { rows } = await pgQuery(sql, params);
    return rows;
  },
  $transaction: async (fn: (tx: any) => Promise<any>) => {
    // Not a real transaction; runs against the same adapter
    return fn(prismaCompat);
  },
};

for (const model of Object.keys(modelToTable)) {
  prismaCompat[model] = tableApi(model);
}

export default prismaCompat as any;