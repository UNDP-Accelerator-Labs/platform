const { status } = require("../contribute/pad/load");

const { DB } = include("config/");
const { sessionupdate } = include('routes/helpers/')

module.exports = async (req, res) => {
  const { sessionID: sid } = req || {};
  let { fromHostBase } = req.body || {};
  fromHostBase = fromHostBase === "true" || fromHostBase === true;
  
  await DB.general.tx(async (t) => {
	await sessionupdate({
        conn: t,
        queryValues: [sid],
        whereClause: `sid = $1`,
      });
  });

  if (fromHostBase) {
    return res.status(200).json({
      status:200,
      success: true,
      message: "Session logged out successfully.",
    });
  }
  res.redirect("/");
};
