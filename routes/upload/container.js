const { app_title_short } = include('config/')

module.exports = async (blobServiceClient) => {
	// CREATE CONTAINER
	const containerClient = blobServiceClient.getContainerClient(app_title_short)
	const createContainerResponse = await containerClient.createIfNotExists({ access: 'blob' })
	return containerClient
}