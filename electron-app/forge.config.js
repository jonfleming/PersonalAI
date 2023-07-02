const path = require('path');
const fs = require('fs');

module.exports = {
  publishers: [
    {
      name: '@electron-forge/publisher-github',
      config: {
        repository: {
          owner: 'jonfleming',
          name: 'PersonalAI'
        },
        prerelease: false,
        draft: true
      }
    }
  ],  
  packagerConfig: {
    asar: true,
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {
        "name": "PersonalAI"
      },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['darwin'],
    },
    {
      name: '@electron-forge/maker-deb',
      config: {},
    },
    {
      name: '@electron-forge/maker-rpm',
      config: {},
    },
  ],
  hooks: {
    packageAfterCopy: async (config, buildPath, electronVersion, platform, arch) => {
      console.log('**************** Copy ****************', buildPath)
      fs.writeFileSync('./jon.txt', buildPath)
      const src = path.join(__dirname, '../react-app/build/');
      const dst = buildPath;
      fs.cpSync(src, dst, {recursive: true});
    }
  },
  plugins: [
    {
      name: '@electron-forge/plugin-auto-unpack-natives',
      config: {},
    },
  ],
};
