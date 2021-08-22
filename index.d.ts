import Web3 from "web3";
import type { AbiItem } from "web3-utils";
import type { Contract } from "web3-eth-contract";
export * from "./utils";
export declare type ContractInfo = {
    abi: AbiItem[] | AbiItem;
    address: string;
};
export declare const createWeb3ContractsServices: <ContractName extends string>(nodesUrls: string[], contractDetailsMap: Record<ContractName, ContractInfo>) => {
    url: string;
    web3: Web3;
    contracts: Record<ContractName, Contract>;
}[];
export declare const createLoadBalancedContractsService: <ContractName extends string>(contractsServices: {
    url: string;
    web3: Web3;
    contracts: Record<ContractName, Contract>;
}[], options?: {
    initialServiceIndex?: number | undefined;
    initialServicesStats?: {
        firstRequestAtMillis: number;
        numberOfAccesses: number;
    }[] | undefined;
    retryOnErrorDelayInMillis?: number | undefined;
    retryOnRateLimitInSeconds?: number | undefined;
    maxRequestsPerNode?: number | undefined;
    maxDurationOfMaxRequestsPerNodeInMinutes?: number | undefined;
    rateLimitFactor?: number | undefined;
} | undefined) => {
    nodeIndex: () => number;
    runContract: (contractName: ContractName, methodName: string, methodParameters?: any[] | undefined, callParameters?: Record<string, any> | undefined, options?: {
        retryIntervalInSeconds?: number | undefined;
    } | undefined) => Promise<any>;
};
