const nodemailer = require('nodemailer');
const mailGun = require('nodemailer-mailgun-transport');

const auth = {
  auth: {
    api_key: '52a19535a7e4c27e58349aa865bddc3a-1d8af1f4-3cf63c25',
    domain: 'sandbox7beccea89f514378b3aeeba98c7da11a.mailgun.org'
  }
};

const transporter = nodemailer.createTransport(mailGun(auth));


const sendMail = (email, subject, message, cb) => {
  const mailOptions = {
    from: email,
    to: 'viki2711@gmail.com',
    subject: subject,
    text: message
  };

  transporter.sendMail(mailOptions, function(err, data) {
    if (err) {
      cb(err, null);
    } else {
      cb(null, data);
    }
  });
}

module.exports = sendMail;
