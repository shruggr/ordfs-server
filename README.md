# OrdFS Server

This project provides an ExpressJS server to host your website from an Ordinal.

### Stand-alone
`npm install`
`npm run start`

Navigate to `http://localhost:8080/` to view the demo page, or `http://localhost:8080/971388081f6601b0e502adbfceef68d152e7f27ba5aff0230d2567aaa8acb768_0` to render an inscription.

### Integrate with existing Express server
```
import { RegisterRoutes } from 'ordfs-server';

const app = express();
...

RegisterRoutes(app);
```

### DNS Registration
2 DNS records are required

1. `A` or `CNAME` record to point domain to wherever this server is running
2. `TXT` record for the same domain, which points sever to InscriptionId which should function as home page for the domain
   - `ordfs=<InscriptionID>` 


### Config
#### BTC Node
Set the following ENVIRONMENT VARS to point to your BTC Node. REST server must be enabled.
`BTC_HOST=`
`BTC_PORT=`
`BTC_UN=`
`BTC_PW=`

#### BSV Node (Optional. JungleBus is used as a fallback if not configured)
Set the following ENVIRONMENT VARS to point to your BSV Node. REST server must be enabled.
`BITCOIN_HOST=`
`BITCOIN_PORT=`
`BITCOIN_UN=`
`BITCOIN_PW=`