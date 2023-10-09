const { DB } = include("config/");

module.exports = async (req, res) => {
  const { sessionID: sid } = req || {};
  await DB.general.tx(async (t) => {
    await t.none(
      `
		UPDATE trusted_devices
		SET session_sid = NULL
		  WHERE session_sid = $1;
		`,
      [sid]
    );

    await t.none(`DELETE FROM session WHERE sid = $1;`, [sid]);
  });
  req.session.destroy();
  res.redirect("/");
};
