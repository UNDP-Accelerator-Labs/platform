const { checklanguage, join} = include('routes/helpers/')
const validate = require('uuid').validate;
const { BlobServiceClient } = require("@azure/storage-blob");

const containerName = 'solutions-mapping'
const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);	
const containerClient = blobServiceClient.getContainerClient(containerName);

module.exports = async kwargs => {
	const { req } = kwargs
	const { object, space } = req.params || {}
	const { uuid, rights, collaborators } = req.session || {}
	const language = checklanguage(req.params?.language || req.session.language)

	let file_data = []
	if(space === 'private'){
		const prefix = `uploads/02da0200-a768-4b1e-a8c6-27339d6c4d90/`
		 await getBlobList(uuid, containerName, prefix, space)
		 .then(async results => {
			const data = await join.users(results, [ language, 'owner' ])
			file_data = {
				data,
				sections: [{ data }]
			}
		}).catch(err => console.log(err))
	}
	else if(space === 'team'){
		let blobs = []
		for await (const element of collaborators) {
			const prefix = `uploads/${element.uuid}/`
			await getBlobList(element.uuid, containerName, prefix, space)
			.then(async results => {
				if(results) blobs.push(...results)	
			}).catch(err => console.log(err))
		};
		
		const data = await join.users(blobs, [ language, 'owner' ])
		file_data =  {
			data,
			sections: [{ data }] 
		}
	}
	else if( space === 'all' && rights >= 3 ){
		await getBlobList(uuid, containerName, '', space)
		 .then(async results => {
			const data = await join.users(results, [ language, 'owner' ])
			file_data =  {
				data,
				sections: [{ data }] 
			}
		}).catch(err => console.log(err))
	}
	return file_data;
}



async function getBlobList(uuid, containername, prefix, space = 'private') {
	let blobs;
	if(space === 'all'){
		blobs = containerClient.listBlobsFlat();
	}
	else {
		blobs = containerClient.listBlobsByHierarchy("/", { prefix });
	}
	let list = []
	for await (const blob of blobs) {
		if (blob.kind === "blob") {
			list.push({
				status: 1, //DEFAULT STATUS TO 1 FOR FRONTEND
				title: blob?.name,
				created_at: new Date(blob?.properties?.createdOn).toDateString(),
				contentType: blob?.properties?.contentType,
				id: blob?.name,
				kind: blob?.kind,
				owner: uuid,
				url: `https://acclabplatforms.blob.core.windows.net/${containername}/${blob?.name}`
			})
		} else {
			const u_uuid = blob?.name.split('/')[1]
			console.log('validate(u_uuid) ', validate(u_uuid))
			if(validate(u_uuid)){
				list.push({
					status: 1, //DEFAULT STATUS TO 1 FOR FRONTEND
					title: blob?.name,
					created_at: new Date(blob?.properties?.createdOn).toDateString(),
					contentType: blob?.properties?.contentType,
					id: blob?.name,
					kind: 'blob',
					owner: u_uuid,
					url: `https://acclabplatforms.blob.core.windows.net/${containername}/${blob?.name}`
				})
			}
		}
	}
	return list
}
