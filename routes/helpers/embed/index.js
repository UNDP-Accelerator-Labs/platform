
const {
    app_id,
  } = include('config/');
const fetch = require('node-fetch')

module.exports = async (id) => {
    const{ API_TOKEN, NLP_WRITE_TOKEN, NODE_ENV, ALLOW_EMBEDDING, NLP_API_URL } = process.env;
    
    const prefix = {
        "sm": "solution",
        "ap": "actionplan",
        "exp": "experiment",
    }

    let body = {
      token: API_TOKEN,
      write_access: NLP_WRITE_TOKEN,
      db: NODE_ENV === "production" ? 'main' : "test",
      main_id: `${prefix[app_id]}:${id}`,
    };
  
    if (ALLOW_EMBEDDING === "false" || !ALLOW_EMBEDDING)  return console.log("Embedding not allowed");

    try {
      const response = await fetch(`${NLP_API_URL}/api/embed/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });
  
      if (!response.ok) {
        const errorMessage = await response.text();
        console.error(
          "Network response was not ok: ",
          response.statusText,
          errorMessage
        );
        throw Error("Network response was not ok ");
      }
  
      return console.log("Embedding successfully added/updated");
    } catch (error) {
      console.error("Error: ", error);
      console.error("Input: ", body);
      throw Error(error);
    }
  };