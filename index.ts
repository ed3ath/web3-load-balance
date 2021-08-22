import Web3 from "web3"
import type { AbiItem } from "web3-utils"
import type { Contract } from "web3-eth-contract"
import { hasNumberOfMinutesPast, isFunction, isObject, sleep } from "./utils"

export * from "./utils"

export type ContractInfo = {
	abi: AbiItem[] | AbiItem
	address: string
}

export type LoadBalancedWeb3Service<ContractName extends string> = {
	/**
	 * Current public node index.
	 */
	nodeIndex: () => number

	/**
	 * `NOTE` Only do one (1) node request to take advantage of
	 * load balancing.
	 *
	 * Run a contract method with this one. To have full access to
	 * a contract APIs, use `onContract`.
	 *
	 * -
	 *
	 * Example of old `web3` convention. See the next snippet after this.
	 *
	 * ```
	 * CryptoBladesContract.methods:
	 * 	.inGameOnlyFunds('0xF9BDE92bF245c3CeB30bc556AE1D56E05bF56335)
	 * 	.call({
	 * 		from: "0x0000000000000000000000000000000000000000"
	 * 	})
	 * ```
	 *
	 * -
	 *
	 * Example of new `web3-load-balance` convention:
	 *
	 * ```
	 * runContract(
	 * 	'cryptoblades',
	 * 	'inGameOnlyFunds',
	 * 	['0xF9BDE92bF245c3CeB30bc556AE1D56E05bF56335'],
	 * 	{ form: '0x0000000000000000000000000000000000000000' }
	 * )
	 * ```
	 */
	runContract: (
		contractName: ContractName,
		methodName: string,
		methodParameters?: any[],
		callParameters?: Record<string, any>,
		options?: { retryIntervalInSeconds?: number }
	) => any

	/**
	 * `NOTE` Only do one (1) node request to take advantage of
	 * load balancing.
	 *
	 * -
	 *
	 * Example:
	 *
	 * ```
	 * runWeb3((web3) => web3.eth.getBlock(12345678))
	 * ```
	 */
	runWeb3: <T>(callback: (web3: Web3) => T) => Promise<T>

	/**
	 * `NOTE` Only do one (1) node request to take advantage of
	 * load balancing.
	 *
	 * -
	 *
	 * Example of old `web3` convention. See the next snippet after this.
	 *
	 * ```
	 * CryptoBladesContract.methods:
	 * 	.inGameOnlyFunds('0xF9BDE92bF245c3CeB30bc556AE1D56E05bF56335)
	 * 	.call({
	 * 		from: "0x0000000000000000000000000000000000000000"
	 * 	})
	 * ```
	 *
	 * -
	 *
	 * Example of new `web3-load-balance` convention:
	 *
	 * ```
	 * onContract(
	 * 	'cryptoblades',
	 * 	(contract) => contract
	 * 		.methods
	 * 		.inGameOnlyFunds('0xF9BDE92bF245c3CeB30bc556AE1D56E05bF56335)
	 * 		.call({
	 * 			from: "0x0000000000000000000000000000000000000000"
	 * 		})
	 * )
	 * ```
	 */
	onContract: <T>(
		contractName: ContractName,
		callback: (contract: Contract) => Promise<T>,
		options?: { retryIntervalInSeconds?: number }
	) => Promise<T>
}

export const createWeb3ContractsServices = <ContractName extends string>(
	nodesUrls: string[],
	contractDetailsMap: Record<ContractName, ContractInfo>
) => {
	const web3Services = nodesUrls.map((url) => {
		const web3 = new Web3(url)

		const contracts = (
			Object.entries<{
				abi: AbiItem[] | AbiItem
				address: string
			}>(contractDetailsMap) as [
				contractName: ContractName,
				contractDetails: ContractInfo
			][]
		).reduce((map, [contractName, { abi, address }]) => {
			const contract = new web3.eth.Contract(abi, address)

			return {
				...map,
				[contractName]: contract,
			}
		}, {} as Record<ContractName, Contract>)

		return {
			url,
			web3: web3,
			contracts,
		}
	})

	// const contract = new web3Services[0].eth.Contract();

	return web3Services
}

export const createLoadBalancedContractsService = <ContractName extends string>(
	contractsServices: {
		url: string
		web3: Web3
		contracts: Record<ContractName, Contract>
	}[],
	options?: {
		initialServiceIndex?: number
		initialServicesStats?: {
			firstRequestAtMillis: number
			numberOfAccesses: number
		}[]
		retryOnErrorDelayInMillis?: number
		retryOnRateLimitInSeconds?: number
		maxRequestsPerNode?: number
		maxDurationOfMaxRequestsPerNodeInMinutes?: number
		rateLimitFactor?: number
	}
): LoadBalancedWeb3Service<ContractName> => {
	const {
		initialServiceIndex = 0,
		initialServicesStats = [] as {
			firstRequestAtMillis: number
			numberOfAccesses: number
		}[],
		retryOnErrorDelayInMillis = 1000,
		retryOnRateLimitInSeconds = 3,
		maxRequestsPerNode = 10000,
		maxDurationOfMaxRequestsPerNodeInMinutes = 5,
		rateLimitFactor = 5,
	} = options || {}

	const finalMaxRequestsPerNode = maxRequestsPerNode / rateLimitFactor
	const finalMaxDurationOfMaxRequestsPerNodeInMinutes =
		maxDurationOfMaxRequestsPerNodeInMinutes / rateLimitFactor

	/**
	 * For load balancing round robin
	 */
	let serviceIndex = initialServiceIndex

	const tempServicesStats = initialServicesStats.map((stats) => ({ ...stats }))

	const servicesStats =
		tempServicesStats.length === contractsServices.length
			? tempServicesStats
			: contractsServices.map(() => ({
					firstRequestAtMillis: Date.now(),
					numberOfAccesses: 0,
			  }))

	const canRequest = (currentNodeIndex: number) => {
		const { numberOfAccesses, firstRequestAtMillis } =
			servicesStats[currentNodeIndex]

		if (numberOfAccesses < finalMaxRequestsPerNode) {
			servicesStats[currentNodeIndex].numberOfAccesses += 1

			return true
		}

		if (
			hasNumberOfMinutesPast(
				firstRequestAtMillis,
				finalMaxDurationOfMaxRequestsPerNodeInMinutes
			)
		) {
			servicesStats[currentNodeIndex].firstRequestAtMillis = Date.now()
			servicesStats[currentNodeIndex].numberOfAccesses = 1

			return true
		}

		return false
	}

	const getService = (
		finalRetryOnRateLimitInSeconds = retryOnRateLimitInSeconds
	) =>
		new Promise(
			(
				resolve: (theWeb3Service: {
					web3: Web3
					contracts: Record<ContractName, Contract>
				}) => void
			) => {
				const currentNodeIndex = serviceIndex
				serviceIndex = (serviceIndex + 1) % contractsServices.length

				if (canRequest(currentNodeIndex)) {
					resolve(contractsServices[currentNodeIndex])

					return
				}

				const interval = setInterval(() => {
					if (canRequest(currentNodeIndex)) {
						clearInterval(interval)
						resolve(contractsServices[currentNodeIndex])
					}
				}, 1000 * finalRetryOnRateLimitInSeconds)
			}
		)

	const runContract = async (
		contractName: ContractName,
		methodName: string,
		methodParameters?: any[],
		callParameters?: Record<string, any>,
		options?: { retryIntervalInSeconds?: number }
	) => {
		const retryIntervalInSeconds =
			options?.retryIntervalInSeconds || retryOnRateLimitInSeconds

		const service = await getService(retryIntervalInSeconds)

		const contract = service.contracts[contractName]
		const runMethod = contract.methods[methodName]

		if (isFunction(runMethod)) {
			const methodResult = methodParameters
				? runMethod(...methodParameters)
				: runMethod()

			const { call } = isObject<{
				call?: (parameters?: Record<string, any>) => any
			}>(methodResult)
				? methodResult
				: { call: undefined }

			if (isFunction(call)) {
				return (callParameters ? call(callParameters) : call()).catch(
					async (error: any) => {
						if (!retryOnErrorDelayInMillis) {
							if (error instanceof Error) {
								return Promise.reject(error)
							}
						}

						await sleep(retryOnErrorDelayInMillis)

						return runContract(
							contractName,
							methodName,
							methodParameters,
							callParameters,
							options
						)
					}
				)
			}
		}

		return null
	}

	const runWeb3 = async <T>(
		callback: (web3: Web3) => T,
		options?: { retryOnRateLimitInSeconds?: number }
	) => {
		const {
			retryOnRateLimitInSeconds:
				finalRetryOnRateLimitInSeconds = retryOnRateLimitInSeconds,
		} = options || {}

		const service = await getService(finalRetryOnRateLimitInSeconds)

		return callback(service.web3)
	}

	const onContract: LoadBalancedWeb3Service<ContractName>["onContract"] =
		async <T>(
			contractName: ContractName,
			callback: (contract: Contract) => Promise<T>,
			options?: { retryIntervalInSeconds?: number }
		) => {
			const {
				retryIntervalInSeconds:
					finalRetryIntervalInSeconds = retryOnRateLimitInSeconds,
			} = options || {}

			const service = await getService(finalRetryIntervalInSeconds)

			return callback(service.contracts[contractName]).catch(async () => {
				await sleep(retryOnErrorDelayInMillis)

				return onContract(contractName, callback, options)
			})
		}

	return {
		nodeIndex: () => serviceIndex,
		runContract,
		runWeb3,
		onContract,
	}
}
