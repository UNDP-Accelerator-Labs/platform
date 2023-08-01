const { app_title } = include('config/')
const nodeMailer = require('nodemailer')
const sgMail = require('@sendgrid/mail');

module.exports = (kwargs) => {
	const { SENDGRID_API_KEY, SENDER_IDENTITY } = process.env;
	sgMail.setApiKey(SENDGRID_API_KEY);

	let { to, subject, html } = kwargs

	if (!to) return { status: 500, message: 'The message has no recipient.' }
	if (!subject) return { status: 500, message: 'The message has no subject.' }
	if (!html) return { status: 500, message: 'There is no message to send.' }

	try {
		const msg = {
		to,
		from: `${app_title} <${SENDER_IDENTITY}>`,
		subject,
		html,
		};

		return new Promise(resolve => {
			if (process.env.NODE_ENV === 'local') {
				sgMail.send(msg)
				.then(() => {}, error => {
					if (error.response) {
						resolve({ status: 500, message: error.response })
					}
					resolve({ status: 200, message: `Message sent!` })
				  });
			} else {
				console.log('should not send email because not in prodcution')
				resolve(null)
			}
		})
	} catch (error) {
		console.error('Error sending email:', error);
	}
}


