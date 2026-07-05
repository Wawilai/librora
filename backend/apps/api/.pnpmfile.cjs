// Allow build scripts for packages that need native compilation
function readPackage(pkg) {
  return pkg;
}

module.exports = { hooks: { readPackage } };
