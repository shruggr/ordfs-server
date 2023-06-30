import { loadInscription } from "../src/lib";

async function main() {
    const file = await loadInscription('7286fc9119a7630bad27f98459d81802ad2e100f78ba0ab993bbf0546ad9f730i0');
    console.log('File:', file);
    console.log(file.data.toString())
}

main().catch(console.error)
    .then(() => process.exit())

