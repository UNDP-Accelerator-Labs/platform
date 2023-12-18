const { DB } = require('../../../config')
const { app_storage } = require('../../../config/edit/index')
const validate = require('uuid').validate;
const { BlobServiceClient } = require("@azure/storage-blob");
const fs = require('fs');

const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

const containerName = 'action-plans'

async function getBlobList(containername) {
    const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);	
    const containerClient = blobServiceClient.getContainerClient(containername);

    const blobs = containerClient.listBlobsFlat()
	
	let list = []
    let unknown = []
    let distintuuid = []

    console.log('Please wait, processing blob list...')
	for await (const blob of blobs) {
        try {
            const u_uuid = blob?.name.split('/')[1] //EXTRACT USER UUID FROM FILE NAME
            const f_name = blob?.name.split('/')[2]
            if(blob && validate(u_uuid)){ 
                if(await checkUUID(u_uuid)){ //CHECK IF THERE IS A VALID USER WITH THE UUID
                    list.push({
                        name: f_name,
                        date: blob?.properties?.createdOn,
                        owner: u_uuid,
                        path: `${app_storage}${containername}/${blob?.name}`,
                    })
                } else {
                    if(!distintuuid.includes(u_uuid) && !u_uuid.includes('/sm/')){
                        distintuuid.push(u_uuid)
                    }
                    unknown.push({
                        name: blob?.name,
                        date: blob?.properties?.createdOn,
                        owner: u_uuid,
                        path: `${app_storage}${containername}/${blob?.name}`,
                    })
                }
            }
        } catch(err) {
            console.log(`Error processing blob ${blob?.name}: ${err}`);
        }
    }
    console.log('Blob list processed...')
    console.log('There are ' + list.length + ' records with known users.')
    console.log('There are ' + unknown.length + ' records with unknown users.')
    console.log('There are ' + distintuuid.length + ' records with disticnt unknown users.')
    
    fs.writeFile('distinctunknownuser.txt', distintuuid.join('  '), (err) => {
        if (err) throw err;
        console.log('Data written to file');
    });

	return [list, unknown]
}

async function insertIntoDB(results) {
    console.log('Inserting data into DB...')
    await DB.conn.any(`
        INSERT INTO files (name, date, owner, path)
        SELECT * FROM UNNEST($1::text[], $2::date[], $3::uuid[], $4::text[])
    `,[
        results.map(r => r.name),
        results.map(r => r.date),
        results.map(r => r.owner),
        results.map(r => r.path)
    ])
    console.log('Data inserted successfully')
}

async function checkUUID(uuid) {
   const value = await DB.general.oneOrNone(`
    SELECT TRUE as bool FROM users
    WHERE uuid = $1
    `, [uuid],  d => d?.bool)
    .catch(err => false)

    return value
}

async function extractFileInfoFromAzureStorage (){
      const [know_users, unknown_users] = await getBlobList(containerName).catch(err => console.log(`Error getting blob list: ${err}`));
  
      readline.question('Please choose an option: \n1. Abort the inserting into the database because there are some records with unknown data. \n2. Insert only the records with known users. \n3. Insert records with unknown users. \n4. Insert all records. \n >>> ', async (answer) => {
          switch(answer) {
              case '1':
                  console.log('Operation aborted.')
                  readline.close();
                  break;
              case '2':
                  if(know_users) {
                      await insertIntoDB(know_users).catch(err => console.log(`Error inserting data into DB: ${err}`));
                  }
                  console.log('Operation completed.')
                  readline.close();
                  break;
              case '3':
                  if(unknown_users) {
                      await insertIntoDB(unknown_users).catch(err => console.log(`Error inserting data into DB: ${err}`));
                  }
                  console.log('Operation completed.')
                  readline.close();
                  break;
              case '4':
                  if(know_users) {
                      await insertIntoDB(know_users).catch(err => console.log(`Error inserting data into DB: ${err}`));
                  }
                  if(unknown_users) {
                      await insertIntoDB(unknown_users).catch(err => console.log(`Error inserting data into DB: ${err}`));
                  }
                  console.log('Operation completed.')
                  readline.close();
                  break;
              default:
                  console.log('Invalid option. Operation aborted.')
                  readline.close();
          }
      });
}
  

extractFileInfoFromAzureStorage()