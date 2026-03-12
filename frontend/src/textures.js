// textures.js — Texturas SVG seamless para canal TEXTURE UV
// Fuente: /public/texturas/*.svg

function fmt(slug) {
  return slug
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ')
}

function svg(slug) {
  return {
    id:       slug,
    name:     fmt(slug),
    svg:      `/texturas/${slug}.svg`,
    type:     'svg',
    tileSize: 80,
    tileGap:  0,
  }
}

export const TEXTURES = [
  svg('zig-zag'),
  svg('wiggle'),
  svg('stripes'),
  svg('diagonal-stripes'),
  svg('diagonal-lines'),
  svg('heavy-rain'),
  svg('rain'),
  svg('current'),
  svg('signal'),
  svg('line-in-motion'),

  svg('hexagons'),
  svg('overlapping-hexagons'),
  svg('squares'),
  svg('squares-in-squares'),
  svg('boxes'),
  svg('graph-paper'),
  svg('tiny-checkers'),
  svg('houndstooth'),
  svg('plus'),
  svg('rounded-plus-connected'),

  svg('polka-dots'),
  svg('pixel-dots'),
  svg('bubbles'),
  svg('overlapping-circles'),
  svg('intersecting-circles'),
  svg('bevel-circle'),
  svg('4-point-stars'),
  svg('slanted-stars'),

  svg('brick-wall'),
  svg('floor-tile'),
  svg('bathroom-floor'),
  svg('parkay-floor'),
  svg('temple'),
  svg('lisbon'),
  svg('moroccan'),
  svg('aztec'),
  svg('hideout'),
  svg('architect'),

  svg('circuit-board'),
  svg('connections'),
  svg('steel-beams'),
  svg('rails'),
  svg('cage'),
  svg('tic-tac-toe'),
  svg('dominos'),
  svg('piano-man'),

  svg('topography'),
  svg('overcast'),
  svg('endless-clouds'),
  svg('overlapping-diamonds'),
  svg('flipped-diamonds'),
  svg('morphing-diamonds'),
  svg('falling-triangles'),
  svg('random-shapes'),

  svg('leaf'),
  svg('autumn'),
  svg('bamboo'),
  svg('kiwi'),
  svg('groovy'),
  svg('melt'),
  svg('jupiter'),
  svg('volcano-lamp'),
  svg('cork-screw'),
  svg('curtain'),
  svg('wallpaper'),
  svg('glamorous'),
  svg('formal-invitation'),

  svg('anchors-away'),
  svg('bank-note'),
  svg('charlie-brown'),
  svg('church-on-sunday'),
  svg('circles-and-squares'),
  svg('cutout'),
  svg('death-star'),
  svg('eyes'),
  svg('fancy-rectangles'),
  svg('floating-cogs'),
  svg('happy-intersection'),
  svg('i-like-food'),
  svg('jigsaw'),
  svg('lips'),
  svg('pie-factory'),
  svg('skulls'),
  svg('stamp-collection'),
  svg('texture'),
  svg('x-equals'),
  svg('yyy'),
]
