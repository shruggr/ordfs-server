# OrdFS Server

This project provides an ExpressJS server to host your website from an Ordinal.

### Stand-alone
`npm run start`

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
Set the following ENVIRONMENT VARS
BTC