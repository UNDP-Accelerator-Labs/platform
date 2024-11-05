# Endpoint for generating maps

Two options:
```
{platform.origin}/apis/fetch/map?{kwargs}
```

Keyword arguments (`kwargs`) should follow the structure:
```
{	
	projsize: number | default 1200px,
	background-color: string | default 'transparent',
	base-color: string | default 'rgba(102,117,127,.25)',
	layers: array [
		{
			lat: number | required,
			lng: number | required,
			count: number | required,
			color: string | default '#32bee1',
			type: string 'point' | required,
			label: string | optional,
		}
	] | optional,
}
```

- `projsize` essentially defines the (square) size of the image (`projsize*projsize`).
- `background-color` indicates the background color of the map. This is essetialy the color of the oceans.
- `base-color` indicates the color of the landmasses.
- `layers` are overlays on the base map, like points for a *dot map*.

For now only point layers are available and labels are not yet implemented.