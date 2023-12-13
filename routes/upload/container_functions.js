const { app_title_short } = include('config/')

exports.createContainer = async (blobServiceClient) => {
	// CREATE CONTAINER
	const containerClient = blobServiceClient.getContainerClient(app_title_short)
	const createContainerResponse = await containerClient.createIfNotExists({ access: 'blob' })
	return containerClient
}

exports.moveBlob = async function (kwargs) {
	const { containerClient, source, target } = kwargs
	// CREDIT: https://stackoverflow.com/questions/68637826/javascript-azure-blob-storage-move-blob
	const sourceBlobClient = containerClient.getBlobClient(source);
	const targetBlobClient = containerClient.getBlobClient(target);
	console.log('Copying source blob to target blob...');
	const copyResult = await targetBlobClient.beginCopyFromURL(sourceBlobClient.url);
	console.log('Blob copy operation started successfully...');
	console.log(copyResult);
	do {
		console.log('Checking copy status...')
		const blobCopiedSuccessfully = await checkIfBlobCopiedSuccessfully(targetBlobClient);
		if (blobCopiedSuccessfully) {
			break;
		}
	} while (true);
	console.log('Now deleting source blob...');
	await sourceBlobClient.delete();
	console.log('Source blob deleted successfully....');
	console.log('Move operation complete.');
}

async function checkIfBlobCopiedSuccessfully(targetBlobClient) {
	const blobPropertiesResult = await targetBlobClient.getProperties();
	const copyStatus = blobPropertiesResult.copyStatus;
	return copyStatus === 'success';
}
