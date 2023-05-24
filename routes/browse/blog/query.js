// Retrieve aggregate data from the database
const { page_content_limit } = include('config/')

exports.blogAggQuery =`
    SELECT COUNT(*) AS totalBlogs
    FROM articles
    WHERE has_lab IS TRUE
;`;

exports.totalArticleTyle = `
    SELECT COUNT(DISTINCT article_type) AS totalArticleTypes
    FROM articles;
`

exports. totalCountries = `
    SELECT COUNT(DISTINCT country) AS totalCountries
    FROM articles WHERE has_lab IS TRUE;
`

exports.totalUnknownCountries = `
    SELECT COUNT(*) AS totalUnknownCountries
    FROM articles
    WHERE country IS NULL;
`
exports.searchBlogQuery = (searchText, page, country, type) => {
    let whereClause = '';
  
    if (country) {
      if (Array.isArray(country) && country.length > 0) {
        whereClause += ` AND country IN ('${country.join("','")}')`;
      } else if (typeof country === 'string') {
        whereClause += ` AND country = '${country}'`;
      }
    }
  
    if (type) {
      if (Array.isArray(type) && type.length > 0) {
        whereClause += ` AND article_type IN ('${type.join("','")}')`;
      } else if (typeof type === 'string') {
        whereClause += ` AND article_type = '${type}'`;
      }
    }
 
    return {
      text: `
          WITH search_results AS (
              SELECT id, url, content, country, article_type, title, posted_date, posted_date_str, language, created_at
              FROM articles
              WHERE (title LIKE '%' || $3 || '%' OR content LIKE '%' || $3 || '%' OR all_html_content LIKE '%' || $3 || '%' OR country LIKE '%' || $3 || '%')
              AND has_lab IS TRUE
                ${whereClause}
              LIMIT $1 OFFSET $2
          ),
          total_count AS (
              SELECT COUNT(*) AS total_records
              FROM articles
              WHERE (title LIKE '%' || $3 || '%' OR content LIKE '%' || $3 || '%' OR all_html_content LIKE '%' || $3 || '%' OR country LIKE '%' || $3 || '%' OR country LIKE '%' || $3 || '%')
              AND has_lab IS TRUE
                ${whereClause}
          )
          SELECT sr.*, tc.total_records, (CEIL(tc.total_records::numeric / $1)) AS total_pages, $4 AS current_page
          FROM search_results sr
          CROSS JOIN total_count tc;
      `,
      values: [
        page_content_limit,
        (page - 1) * page_content_limit,
        searchText,
        page,
      ],
    };
  };  


exports.countryGroup = (searchText) => ({
    text: `
        SELECT country, COUNT(*) AS recordCount
        FROM articles
        WHERE has_lab IS TRUE
          AND (title LIKE '%' || $1 || '%'
            OR content LIKE '%' || $1 || '%'
            OR all_html_content LIKE '%' || $1 || '%')
        GROUP BY country;
    `,
    values: [
        searchText
    ],
});

exports.articleGroup = (searchText) => ({
    text: `
        SELECT article_type, COUNT(*) AS recordCount
        FROM articles
        WHERE title LIKE '%' || $1 || '%'
            OR content LIKE '%' || $1 || '%'
            OR all_html_content LIKE '%' || $1 || '%'
            AND has_lab IS TRUE
        GROUP BY article_type;
    `,
    values: [
        searchText
    ],
});


exports.statsQuery = (searchText, country, type) => {
    let whereClause = '';
  
    if (country) {
      if (Array.isArray(country) && country.length > 0) {
        whereClause += ` AND country IN ('${country.join("','")}')`;
      } else if (typeof country === 'string') {
        whereClause += ` AND country = '${country}'`;
      }
    }
  
    if (type) {
      if (Array.isArray(type) && type.length > 0) {
        whereClause += ` AND article_type IN ('${type.join("','")}')`;
      } else if (typeof type === 'string') {
        whereClause += ` AND article_type = '${type}'`;
      }
    }
  
    return {
      text: `
          WITH search_results AS (
              SELECT id, url, content, country, article_type, title, posted_date, posted_date_str, created_at, has_lab, iso3
              FROM articles
              WHERE (title LIKE '%' || $1 || '%' OR content LIKE '%' || $1 || '%' OR all_html_content LIKE '%' || $1 || '%' OR country LIKE '%' || $1 || '%' AND has_lab IS TRUE)
                ${whereClause}
          ),
          total_country_count AS (
              SELECT country, COUNT(*) AS count
              FROM search_results
              WHERE country IS NOT NULL AND has_lab IS TRUE
              GROUP BY country
          ),
          total_null_country_count AS (
              SELECT COUNT(*) AS count
              FROM search_results
              WHERE country IS NULL
              AND has_lab IS TRUE
          ),
          total_article_type_count AS (
              SELECT article_type, COUNT(*) AS count
              FROM search_results
              GROUP BY article_type
          ),
          total_count AS (
              SELECT COUNT(*) AS total_records
              FROM search_results
              WHERE has_lab IS TRUE
          )
          SELECT 
              (SELECT COUNT(DISTINCT country) FROM total_country_count) AS distinct_country_count,
              (SELECT count FROM total_null_country_count) AS null_country_count,
              (SELECT COUNT(DISTINCT article_type) FROM total_article_type_count) AS distinct_article_type_count,
              (SELECT total_records FROM total_count) AS total_records
          ;`,
      values: [
        searchText,
      ],
    };
  };
  

  exports.extractGeoQuery = countries => `
  SELECT
    jsonb_build_object(
      'type', 'Feature',
      'geometry', ST_AsGeoJson(ST_Centroid(ST_Collect(clusters.geo)))::jsonb,
      'properties', json_build_object(
        'pads', json_agg(clusters.cid),
        'count', COUNT(clusters.cid),
        'cid', clusters.cid
      )::jsonb
    ) AS json
  FROM (
    SELECT c.iso3 AS cid, c.has_lab, ST_Point(c.lng, c.lat) AS geo
    FROM countries c
    INNER JOIN country_names cn ON cn.iso3 = c.iso3
    WHERE cn.name IN (${countries.map((_, i) => `$${i + 1}`).join(',')}) AND c.has_lab IS TRUE
  ) AS clusters
  GROUP BY clusters.cid
  ORDER BY clusters.cid;
`;


