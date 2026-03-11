// textures.js — catálogo de texturas disponibles en el editor
// thumb: imagen de preview en el Sidebar
// disp:  mapa de desplazamiento / alpha para el overlay del canvas

export const TEXTURES = [
  {
    id:    'tiles-mosaic',
    name:  'Tiles Mosaic',
    thumb: '/textures/TilesMosaicPennyround001/TilesMosaicPennyround001_COL_2K.png',
    disp:  '/textures/TilesMosaicPennyround001/TilesMosaicPennyround001_DISP_2K.png',
    style: {},
    reliefLayers: 10,
  },
  {
    id:    'water-droplets',
    name:  'Water Droplets',
    thumb: '/textures/WaterDropletsMixedBubbled001/WaterDropletsMixedBubbled001_ALPHAMASKED_2K.png',
    disp:  '/textures/WaterDropletsMixedBubbled001/WaterDropletsMixedBubbled001_DISP_2K.jpg',
    style: {},
    reliefLayers: 10,
  },
  { id: 'gradient-1', name: 'Cuero',     thumb: null, disp: null, style: { background: 'linear-gradient(to bottom right, #a88d75, #755f4d)' }, reliefLayers: 10 },
  { id: 'gradient-2', name: 'Amatista',  thumb: null, disp: null, style: { background: 'linear-gradient(to bottom right, #4A00E0, #8E2DE2)' }, reliefLayers: 10 },
  { id: 'gradient-3', name: 'Océano',    thumb: null, disp: null, style: { background: 'linear-gradient(135deg, #667db6, #0082c8, #667db6)' }, reliefLayers: 10 },
  { id: 'gradient-4', name: 'Fuego',     thumb: null, disp: null, style: { background: 'linear-gradient(to right, #f12711, #f5af19)' }, reliefLayers: 10 },
  { id: 'gradient-5', name: 'Esmeralda', thumb: null, disp: null, style: { background: 'linear-gradient(to bottom right, #11998e, #38ef7d)' }, reliefLayers: 10 },
  { id: 'gradient-6', name: 'Titanio',   thumb: null, disp: null, style: { background: 'linear-gradient(135deg, #434343, #000000)' }, reliefLayers: 10 },
  { id: 'gradient-7', name: 'Lavanda',   thumb: null, disp: null, style: { background: 'linear-gradient(to right, #c471ed, #f64f59)' }, reliefLayers: 10 },
]
