import { loadInscription } from "../src/lib";
// '562d43da46e8510a045cb2f16a287a9828a24a132d15a1d47e23b1fa69b65828_0'
async function main() {
    const file = await loadInscription('a65e3c97a87c179b8689619c063eb9bc0066b550c4a13a8ac471af29089165fa_0');
    console.log('File:', file);
}

main().catch(console.error)
    .then(() => process.exit())