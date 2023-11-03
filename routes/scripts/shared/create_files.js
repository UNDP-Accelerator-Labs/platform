const { DB } = require('../../../config')
const validate = require('uuid').validate;
const { BlobServiceClient } = require("@azure/storage-blob");

async function extractFileInfoFromAzureStorage (){
    const containerName = 'experiments'
    const results = await getBlobList(containerName).catch(err => console.log(`Error getting blob list: ${err}`));
    if(results) {
        await insertIntoDB(results).catch(err => console.log(`Error inserting data into DB: ${err}`));
    }
    console.log('Operation completed.')
}

async function getBlobList(containername) {
    const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);	
    const containerClient = blobServiceClient.getContainerClient(containername);

    const blobs = containerClient.listBlobsFlat()
	
	let list = []
	const blob_url = 'https://acclabplatforms.blob.core.windows.net/'

    console.log('Please wait, processing blob list...')
	for await (const blob of blobs) {
        try {
            const u_uuid = blob?.name.split('/')[1] //EXTRACT USER UUID FROM FILE NAME
            if(blob && validate(u_uuid)){ 
                list.push({
                    name: blob?.name,
                    date: blob?.properties?.createdOn,
                    owner: u_uuid,
                    path: `${blob_url}${containername}/${blob?.name}`,
                })
            }
        } catch(err) {
            console.log(`Error processing blob ${blob?.name}: ${err}`);
        }
    }
    console.log('Blob list processed...')
	return list
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


extractFileInfoFromAzureStorage()