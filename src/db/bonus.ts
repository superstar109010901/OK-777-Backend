import prisma from "./prisma";

export const addOrUpdateReferralBonus = async (
  referredUserId: number,
  bonusAmount: number,
  currency: string = "USDT"
) => {
  try {

    const referredUser = await prisma.user.findUnique({
      where: { id: referredUserId },
      select: { referredById: true },
    });

    if (!referredUser?.referredById) {
      console.log("No inviter, skipping bonus.");
      return null;
    }

    const inviterId = referredUser.referredById;

    const existingBonus = await prisma.referralBonus.findFirst({
      where: { userId: inviterId, fromUserId: referredUserId, currency },
    });

    if (existingBonus) {
  
      const updatedBonus = await prisma.referralBonus.update({
        where: { id: existingBonus.id },
        data: { amount: { increment: bonusAmount } },
      });

      console.log("Referral bonus updated:", updatedBonus);
      return updatedBonus;
    } else {
     
      const newBonus = await prisma.referralBonus.create({
        data: {
          userId: inviterId,
          fromUserId: referredUserId,
          amount: bonusAmount,
          currency,
          status: "pending",
        },
      });

      console.log("Referral bonus created:", newBonus);
      return newBonus;
    }
  } catch (error) {
    console.error("Error adding/updating referral bonus:", error);
    return null;
  }
};

export const convertReferralBonusToPayout = async (
  userId: number,
  amount: number,
  currency: string = "USDT"
) => {
  try {
    const pendingBonuses = await prisma.referralBonus.findMany({
      where: { userId, currency, status: "pending" },
      orderBy: { createdAt: "asc" },
    });

    if (pendingBonuses.length === 0) return null;

    let remainingAmount = amount;

    for (const bonus of pendingBonuses) {
      if (remainingAmount <= 0) break;

      if (bonus.amount <= remainingAmount) {
        remainingAmount -= bonus.amount;
        await prisma.referralBonus.update({
          where: { id: bonus.id },
          data: { status: "paid" },
        });
      } else {
        await prisma.referralBonus.update({
          where: { id: bonus.id },
          data: { amount: bonus.amount - remainingAmount },
        });
        remainingAmount = 0;
      }
    }

    if (remainingAmount > 0) return null;

    const payout = await prisma.payout.create({
      data: {
        userId,
        to: String(userId),
        amount,
        currency,
        status: "pending",
      },
    });

    return payout;
  } catch (error) {
    return null;
  }
};