const { DB } = include('config/')
module.exports = async (req, res) => {
	const { session } = req || {};

    if(!session || !session.uuid) {
        return res.status(401).json({
            status: 401,
            success: false,
            message: 'Unauthorized access. Please log in.'
        });
    }

    return res.status(200).json({
        status: 200,
        success: true,
        message: 'Session is valid.',
        session
    });
}
