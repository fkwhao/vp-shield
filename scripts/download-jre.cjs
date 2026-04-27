const https = require('https')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const RESOURCES_DIR = path.join(__dirname, '..', 'electron', 'resources')
const JRE_DIR = path.join(RESOURCES_DIR, 'jre')

// JRE 17 下载配置 - 使用清华大学镜像（国内高速）
const JRE_DOWNLOADS = {
  win32: {
    url: 'https://mirrors.tuna.tsinghua.edu.cn/Adoptium/17/jre/x64/windows/OpenJDK17U-jre_x64_windows_hotspot_17.0.18_8.zip',
    file: 'jre17-windows.zip'
  },
  darwin: {
    url: 'https://mirrors.tuna.tsinghua.edu.cn/Adoptium/17/jre/x64/mac/OpenJDK17U-jre_x64_mac_hotspot_17.0.18_8.tar.gz',
    file: 'jre17-macos.tar.gz'
  },
  linux: {
    url: 'https://mirrors.tuna.tsinghua.edu.cn/Adoptium/17/jre/x64/linux/OpenJDK17U-jre_x64_linux_hotspot_17.0.19_10.tar.gz',
    file: 'jre17-linux.tar.gz'
  }
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading: ${url}`)
    const file = fs.createWriteStream(dest)

    const request = (url) => {
      https.get(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      }, (response) => {
        if (response.statusCode === 302 || response.statusCode === 301) {
          // Follow redirect
          request(response.headers.location)
          return
        }

        if (response.statusCode !== 200) {
          reject(new Error(`HTTP ${response.statusCode}`))
          return
        }

        const totalSize = parseInt(response.headers['content-length'], 10)
        let downloaded = 0

        response.on('data', (chunk) => {
          downloaded += chunk.length
          const percent = ((downloaded / totalSize) * 100).toFixed(1)
          process.stdout.write(`\rDownloading: ${percent}%`)
        })

        response.pipe(file)

        file.on('finish', () => {
          file.close()
          console.log('\nDownload complete!')
          resolve()
        })
      }).on('error', (err) => {
        fs.unlink(dest, () => {})
        reject(err)
      })
    }

    request(url)
  })
}

function extractArchive(archivePath, destDir) {
  console.log(`Extracting to: ${destDir}`)

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true })
  }

  if (archivePath.endsWith('.zip')) {
    // Windows: use PowerShell to extract
    execSync(`powershell -Command "Expand-Archive -Path '${archivePath}' -DestinationPath '${destDir}' -Force"`, { stdio: 'inherit' })
  } else if (archivePath.endsWith('.tar.gz')) {
    // Unix: use tar
    execSync(`tar -xzf "${archivePath}" -C "${destDir}"`, { stdio: 'inherit' })
  }

  console.log('Extraction complete!')
}

async function downloadJRE(platform) {
  const config = JRE_DOWNLOADS[platform]
  if (!config) {
    console.error(`Unsupported platform: ${platform}`)
    process.exit(1)
  }

  const archivePath = path.join(RESOURCES_DIR, config.file)

  // Check if already downloaded
  if (fs.existsSync(JRE_DIR)) {
    console.log('JRE already exists. Delete the jre folder to re-download.')
    return
  }

  // Download
  await downloadFile(config.url, archivePath)

  // Extract
  extractArchive(archivePath, RESOURCES_DIR)

  // Rename extracted folder to 'jre'
  const files = fs.readdirSync(RESOURCES_DIR)
  const extractedDir = files.find(f => f.startsWith('jdk-') && fs.statSync(path.join(RESOURCES_DIR, f)).isDirectory())
  if (extractedDir && extractedDir !== 'jre') {
    if (fs.existsSync(JRE_DIR)) {
      fs.rmSync(JRE_DIR, { recursive: true })
    }
    fs.renameSync(path.join(RESOURCES_DIR, extractedDir), JRE_DIR)
  }

  // Clean up archive
  fs.unlinkSync(archivePath)

  console.log(`\nJRE 17 installed at: ${JRE_DIR}`)
}

// Run for current platform or specified platform
const platform = process.argv[2] || process.platform
downloadJRE(platform).catch(console.error)
