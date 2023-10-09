const { DB } = include("config/");

module.exports = async (req, res) => {
  const { sessionID: sid } = req || {};
  await DB.general.tx(async (t) => {
    await t.none(`UPDATE session SET sess = NULL WHERE sid = $1;`, [sid]);
  });
  res.redirect("/");
};
