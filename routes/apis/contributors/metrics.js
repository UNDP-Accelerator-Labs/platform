const { DB } = include('config/')
module.exports = async (req, res) => {
	const { year } = req.query;
    let query, params;
    
    if(!req.session?.uuid) return res.send('Invalid session!') 

    if (year && +year) {
        // Query to group by month if a year is provided
        query = `
        SELECT
            to_char(COALESCE(created_at, invited_at), 'Month') as period,
            SUM(CASE WHEN created_from_sso THEN 1 ELSE 0 END) as sso_count,
            SUM(CASE WHEN NOT created_from_sso THEN 1 ELSE 0 END) as non_sso_count
        FROM
            public.users
        WHERE
            EXTRACT(YEAR FROM COALESCE(created_at, invited_at)) = $1
        GROUP BY
            to_char(COALESCE(created_at, invited_at), 'Month'),
            date_trunc('month', COALESCE(created_at, invited_at))
        ORDER BY
            date_trunc('month', COALESCE(created_at, invited_at));
        `;
        params = [year];
    } else {
        // Query to group by year if no year is provided
        query = `
        SELECT
            EXTRACT(YEAR FROM COALESCE(created_at, invited_at)) as period,
            SUM(CASE WHEN created_from_sso THEN 1 ELSE 0 END) as sso_count,
            SUM(CASE WHEN NOT created_from_sso THEN 1 ELSE 0 END) as non_sso_count
        FROM
            public.users
        GROUP BY
            EXTRACT(YEAR FROM COALESCE(created_at, invited_at))
        ORDER BY
            EXTRACT(YEAR FROM COALESCE(created_at, invited_at));
        `;
        params = [];
    }

    DB.general.tx(async t=>{
        const batch = []
        batch.push(t.any(query, params))
        batch.push(t.any(`
            SELECT DISTINCT EXTRACT(YEAR FROM COALESCE(created_at, invited_at)) AS year
            FROM public.users
            ORDER BY year;
        `))

        return t.batch(batch)
        .catch(err => console.log(err))
    })
    .then(result=>{
        const [ data, years ] = result
        return res.json({ data, years });
    })
    .catch(err => {
        console.error(err);
        res.status(500).send('Server Error');
      })
}
