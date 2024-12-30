import { Connection, clusterApiUrl, Cluster } from '@solana/web3.js';
import { config } from '../config/config';

let connection: Connection;

if (config.solanaNetwork === 'mainnet-beta') {
    connection = new Connection(config.solanaRpcMainnet, 'confirmed');
} else {
    connection = new Connection(clusterApiUrl(config.solanaNetwork as Cluster), 'confirmed');
}

export { connection };
