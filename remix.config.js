import { flatRoutes } from 'remix-flat-routes';


/** @type {import('@remix-run/dev').AppConfig} */
export default {
  tailwind: true,
  postcss: true,

  ignoredRouteFiles: ["**/.*"],
  routes: async defineRoutes => {
    return flatRoutes('routes', defineRoutes, {
      ignoredRouteFiles: ['**/.*'], // Ignore dot files (like .DS_Store)
      //appDir: 'app',
      //routeDir: 'routes',
      //basePath: '/',
      //paramPrefixChar: '$',
      //nestedDirectoryChar: '+',
      //routeRegex: /((\${nestedDirectoryChar}[\/\\][^\/\\:?*]+)|[\/\\]((index|route|layout|page)|(_[^\/\\:?*]+)|([^\/\\:?*]+\.route)))\.(ts|tsx|js|jsx|md|mdx)$$/,
    })
  },

  // appDirectory: "app",
  // assetsBuildDirectory: "public/build",
  // publicPath: "/build/",
  // serverBuildPath: "build/index.js",

  browserNodeBuiltinsPolyfill: {
    modules: {
      punycode: true,
    },
  },

  serverDependenciesToBundle: [
    "@phosphor-icons/react",
    "@icons-pack/react-simple-icons",
    "@remixicon/react",
  ],
}
