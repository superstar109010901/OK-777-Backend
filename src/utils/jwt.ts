import jwt from 'jsonwebtoken';
import { Roles } from './constants';
import 'dotenv/config';

 export const isAuthenticated = (req, res, next)=>{
    try {
        const token = req.headers.authorization;
        const decodedToken = jwt.verify(token, process.env.JWTPRIVATEKEY);
        req.token = decodedToken;
        next();
      } catch {
        res.status(403).json({
          error: 'Invalid request!',
        });
    }
};

export const isAdmin = (req, res, next)=>{
    try {
        const token = req.headers.authorization;
        const decodedToken = jwt.verify(token, process.env.JWTPRIVATEKEY);
        if(decodedToken.role && decodedToken.role === Roles.admin){
            req.token = decodedToken;
            next();
        }else{
            res.status(403).json({
                error: 'Permission denied!',
            });
        }
      } catch {
        res.status(403).json({
          error: 'Invalid request!',
        });
    }
};

export default isAuthenticated;