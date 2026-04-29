import sharp from 'sharp'
import pngToIco from 'png-to-ico'
import { writeFileSync, readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

async function generateIcons() {
  // 使用 PNG 源文件生成图标
  const sourcePng = join(publicDir, '图层 1.png')
  const pngBuffer = readFileSync(sourcePng)

  // Generate 256x256 PNG
  await sharp(pngBuffer)
    .resize(256, 256)
    .png()
    .toFile(join(publicDir, 'icon-256.png'))

  // Generate 512x512 PNG
  await sharp(pngBuffer)
    .resize(512, 512)
    .png()
    .toFile(join(publicDir, 'icon-512.png'))

  // Generate ICO with multiple sizes
  const png256 = await sharp(pngBuffer).resize(256, 256).png().toBuffer()
  const png128 = await sharp(pngBuffer).resize(128, 128).png().toBuffer()
  const png64 = await sharp(pngBuffer).resize(64, 64).png().toBuffer()
  const png48 = await sharp(pngBuffer).resize(48, 48).png().toBuffer()
  const png32 = await sharp(pngBuffer).resize(32, 32).png().toBuffer()
  const png16 = await sharp(pngBuffer).resize(16, 16).png().toBuffer()

  const icoBuffer = await pngToIco([png256, png128, png64, png48, png32, png16])
  writeFileSync(join(publicDir, 'favicon.ico'), icoBuffer)

  console.log('Icons generated successfully!')
}

generateIcons().catch(console.error)
