exports.updateRecord = _kwargs => {
  const { data, conn } = _kwargs;
  return conn.none(`
    UPDATE users
    SET name = $1,
        email = $2,
        position = $3,
        $4:raw
        iso3 = $5,
        language = $6,
        secondary_languages = $7,
        $8:raw
        notifications = $9,
        reviewer = $10
    WHERE uuid = $11
    ;`,
    data
  );
};
