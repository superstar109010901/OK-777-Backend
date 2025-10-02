import 'dotenv/config';
const nodemailer = require('nodemailer');
const smtpTransport = require('nodemailer-smtp-transport');
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASSWORD = process.env.SMTP_PASSWORD;

export const sendEmail = (email: string,subject: string, text: string)=>{

   return new Promise((resolve, reject)=>{

      try{

        let transporter = nodemailer.createTransport(smtpTransport({
          service: 'gmail',
          type: "SMTP",
          host: "smtp.gmail.com",
          secure: true,
              auth: {
                user: SMTP_USER,
                pass: SMTP_PASSWORD
              }
        }));

        let mailOptions = {
          from: 'info@traiding.com',
          to: email,
          subject: subject,
          text: text
        };

        transporter.sendMail(mailOptions,(error, info)=>{
          if (error) {
            reject(error);
          } else {
            resolve(info);
          }
        });

      }catch(err){
        reject(err);
      }
      
   });
};