// Turns the downloaded originals in source/ into small web images in public/assets.
//   source/wood_table_worn_diff_2k.jpg  Poly Haven "Wood Table Worn" (CC0)            -> public/assets/table.webp
//   source/bourgoin-pl51.jpg           J. Bourgoin, Les Arts arabes (1873), pl. 51 (PD) -> public/assets/card-back.webp
// Run with: node scripts/prepare-assets.cjs
const sharp = require('sharp');
(async () => {
  await sharp('source/wood_table_worn_diff_2k.jpg').resize({ width: 1400 }).webp({ quality: 68 }).toFile('public/assets/table.webp');
  // the large marble panel at the top of the plate (in a 3536 x 5000 scan)
  await sharp('source/bourgoin-pl51.jpg')
    .extract({ left: 1131, top: 778, width: 1980, height: 1980 })
    .resize({ width: 720 })
    .webp({ quality: 74 })
    .toFile('public/assets/card-back.webp');
  console.log('done');
})();
