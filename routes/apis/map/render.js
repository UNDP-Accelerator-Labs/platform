const d3 = require('d3');
const { createCanvas } = require('canvas');
const { app_storage, modules } = include('config/');
const { join } = require ('path');
const { v4: uuidv4 } = require('uuid');

const { BlobServiceClient } = require('@azure/storage-blob');


module.exports = async function (kwargs) {
	const { basemap, projsize, projection, ...renderProperties } = kwargs;

	const width = projsize;
	const height = projsize;

	const canvas = createCanvas(width, height);
	const context = canvas.getContext('2d');

	let { background_color, base_color, layers } = renderProperties;

	if (!background_color) background_color = 'transparent';
	if (!base_color) base_color = 'rgba(102,117,127,.25)';
	if (layers && !Array.isArray(layers)) layers = [layers];
	/*
	layers: [
		{
			lat: number,
			lng: number,
			count: number,
			color: string,
			type: point,
		}
	]
	*/

	const clip = d3.geoClipRectangle(0 ,0, width, height);
	const simplification = 10;

	simplify = d3.geoTransform({
		point: function (x, y, z) {
			if (z >= simplification * state.area) {
				this.stream.point(
					x * state.scale + state.translate[0],
					y * state.scale + state.translate[1]
				);
			}
		}
	})

	state = ({
		scale: 1,
		translate: [0, 0],
		area: 0
	})

	const canvasprojection = { stream: function(s) { return simplify.stream(clip(s)); }}

	const path = d3.geoPath(canvasprojection)
	.context(context);

	// function scale (scaleFactor) {
	// 	return d3.geoTransform({
	// 		point: function(x, y) {
	// 			this.stream.point(x * scaleFactor, y  * scaleFactor);
	// 		}
	// 	});
	// }

	// BACKGROUND
	context.save();
	context.fillStyle = background_color;
	context.fillRect(0, 0, width, height);
	context.restore();
	// BASE MAP
	context.save();
	context.beginPath();
	path(basemap);
	context.fillStyle = base_color;
	context.fill();
	context.restore();
	// LAYERS
	if (layers?.length) {
		const scale = d3.scaleLinear()
			.domain(d3.extent(layers, d => d.count))
			.range([ 0, Math.min(50, projsize / 50) ]);
		layers.forEach(d => {
			let { type, lat, lng, count, color } = d;
			if (!color) color = '#32bee1';
			if (d.type === 'point') {
				const location = projection([ lng, lat ]);
				context.save();
				context.translate(...location);
				context.beginPath();
				context.arc(0, 0, scale(count), 0, 2 * Math.PI);
				context.fillStyle = color;
				context.fill();
				context.restore();
			}
		})
	}
	// TO DO: MISSING LABELS

	
	// SAVE THE IMAGE
	let fileerror = false;
	const targetdir = join('tmp/', 'maps/');

	const { origin } = new URL(app_storage);	
	// ESTABLISH THE CONNECTION TO AZURE
	const blobServiceClient = BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);

	const containerClient = blobServiceClient.getContainerClient('maps');
	const createContainerResponse = await containerClient.createIfNotExists({ access: 'blob' });

	// FIND OR CREATE THE CONTAINER
	const filename = uuidv4();
	const blobClient = containerClient.getBlockBlobClient(`${filename}.png`);
	const exists = await blobClient.exists();

	if (exists) {
		console.log('already exists')
		return { status: 200, file: `${new URL('maps', origin).href}/${blobClient.name}` };
	} else {
		await blobClient.uploadData(canvas.toBuffer('image/png'))
		.catch(err => {
			if(err){
				fileerror = true;
				console.log(err)
			}
		});
		if(!fileerror) return { status: 200, file: `${new URL('maps', origin).href}/${blobClient.name}` };
		else return { status: 400, message: 'error generating the file' };
	}
	
	// return canvas.toDataURL();
	
	
}