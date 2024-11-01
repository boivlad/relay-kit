import { useMemo, type FC } from 'react'
import {
  Button,
  Flex,
  Text,
  Box,
  Input,
  ChainIcon,
  AccessibleList,
  AccessibleListItem
} from '../../../primitives/index.js'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faChevronLeft,
  faExclamationTriangle,
  faMagnifyingGlass
} from '@fortawesome/free-solid-svg-icons'
import { truncateAddress } from '../../../../utils/truncate.js'
import { formatBN } from '../../../../utils/numbers.js'
import {
  TokenSelectorStep,
  type EnhancedCurrencyList
} from '../TokenSelector.js'
import type { Currency } from '@reservoir0x/relay-kit-hooks'
import Fuse from 'fuse.js'
import useRelayClient from '../../../../hooks/useRelayClient.js'
import { ASSETS_RELAY_API, type RelayChain } from '@reservoir0x/relay-sdk'
import { useMediaQuery } from 'usehooks-ts'
import type { Token } from '../../../../types/index.js'
import { solana } from '../../../../utils/solana.js'
import { getRelayUiKitData } from '../../../../utils/localStorage.js'
import { bitcoin } from '../../../../utils/bitcoin.js'

type SetChainStepProps = {
  type?: 'token' | 'chain'
  size: 'mobile' | 'desktop'
  context: 'from' | 'to'
  token?: Token
  multiWalletSupportEnabled?: boolean
  setTokenSelectorStep: React.Dispatch<React.SetStateAction<TokenSelectorStep>>
  setInputElement: React.Dispatch<React.SetStateAction<HTMLInputElement | null>>
  chainSearchInput: string
  setChainSearchInput: React.Dispatch<React.SetStateAction<string>>
  selectToken: (currency: Currency, chainId?: number) => void
  selectedCurrencyList?: EnhancedCurrencyList
}

const fuseSearchOptions = {
  includeScore: true,
  includeMatches: true,
  threshold: 0.2,
  keys: [
    'relayChain.chainId',
    'relayChain.name',
    'relayChain.displayName',
    'name',
    'id',
    'displayName'
  ]
}

type NormalizedChain = {
  id: number
  displayName: string
  isSupported: boolean
  currency: EnhancedCurrencyList['chains'][number] | null
  relayChain: RelayChain
}

export const SetChainStep: FC<SetChainStepProps> = ({
  type,
  size,
  context,
  token,
  multiWalletSupportEnabled = false,
  setTokenSelectorStep,
  setInputElement,
  chainSearchInput,
  setChainSearchInput,
  selectToken,
  selectedCurrencyList
}) => {
  const client = useRelayClient()
  const isSmallDevice = useMediaQuery('(max-width: 600px)')
  const isDesktop = size === 'desktop' && !isSmallDevice

  const supportedChains = selectedCurrencyList?.chains || []
  const allChains =
    client?.chains?.filter(
      (chain: RelayChain) =>
        (context !== 'from' ||
          chain.vmType === 'evm' ||
          chain.id === solana.id ||
          chain.id === bitcoin.id) &&
        (context !== 'from' ||
          multiWalletSupportEnabled ||
          chain.vmType === 'evm')
    ) || []

  const combinedChains: NormalizedChain[] = [
    ...supportedChains.map((currency) => ({
      id: currency.chainId as number,
      displayName: currency.relayChain.displayName,
      isSupported: true,
      currency: currency,
      relayChain: currency.relayChain
    })),
    ...(type === 'chain'
      ? allChains
          .filter(
            (chain) => !supportedChains.some((sc) => sc.chainId === chain.id)
          )
          .map((chain) => ({
            id: chain.id,
            displayName: chain.displayName,
            isSupported: false,
            currency: null,
            relayChain: chain
          }))
      : [])
  ]

  const chainFuse = new Fuse(combinedChains, fuseSearchOptions)

  const filteredChains = useMemo(() => {
    const searchResults =
      chainSearchInput.trim() !== ''
        ? chainFuse.search(chainSearchInput).map((result) => result.item)
        : combinedChains

    return chainSearchInput.trim() === ''
      ? searchResults.sort((a, b) => a.displayName.localeCompare(b.displayName))
      : searchResults
  }, [chainSearchInput, chainFuse, combinedChains])

  return (
    <>
      {type === 'token' ? (
        <Button
          color="ghost"
          size="xs"
          css={{ position: 'absolute', top: -8, left: 0, color: 'gray9' }}
          onClick={() => setTokenSelectorStep(TokenSelectorStep.SetCurrency)}
        >
          <FontAwesomeIcon icon={faChevronLeft} width={10} />
        </Button>
      ) : null}
      <Text
        style="h6"
        css={{
          width: '100%',
          textAlign: 'left',
          marginLeft: type === 'token' ? '80px' : '0'
        }}
      >
        Select Chain
      </Text>
      <AccessibleList
        onSelect={(value) => {
          if (value && value !== 'input') {
            const chain = filteredChains.find(
              (chain) => chain.id.toString() === value
            )
            if (chain) {
              const token =
                chain.isSupported && chain.currency?.metadata?.verified
                  ? (chain.currency as Currency)
                  : {
                      ...chain.relayChain.currency,
                      metadata: {
                        logoURI: `${ASSETS_RELAY_API}/icons/currencies/${chain.relayChain.currency?.id}.png`,
                        verified: true
                      }
                    }
              selectToken(token, chain.id)
            }
          }
        }}
        css={{
          display: isDesktop ? 'grid' : 'flex',
          gridTemplateColumns: isDesktop ? 'repeat(2, minmax(0, 1fr))' : 'none',
          gridColumnGap: isDesktop ? '8px' : '0',
          gridAutoRows: 'min-content',
          height: 370,
          overflowY: 'auto',
          pb: '2',
          gap: isDesktop ? '0' : '2',
          width: '100%',
          scrollPaddingTop: '40px'
        }}
      >
        <AccessibleListItem value="input" asChild>
          <Input
            ref={setInputElement}
            placeholder="Search for a chain"
            icon={
              <Box css={{ color: 'gray9' }}>
                <FontAwesomeIcon
                  icon={faMagnifyingGlass}
                  width={16}
                  height={16}
                />
              </Box>
            }
            containerCss={{
              width: '100%',
              height: 40,
              scrollSnapAlign: 'start'
            }}
            style={{
              gridColumn: isDesktop ? '1/3' : '',
              marginBottom: isDesktop ? '10px' : '',
              position: 'sticky',
              top: 0,
              zIndex: 1
            }}
            css={{
              width: '100%',
              _placeholder: {
                textOverflow: 'ellipsis'
              }
            }}
            value={chainSearchInput}
            onChange={(e) =>
              setChainSearchInput((e.target as HTMLInputElement).value)
            }
          />
        </AccessibleListItem>

        {filteredChains?.map((chain) => {
          const decimals = chain?.currency?.balance?.decimals ?? 18
          const compactBalance = Boolean(
            chain?.currency?.balance?.amount &&
              decimals &&
              chain?.currency.balance.amount.toString().length - decimals > 4
          )

          return (
            <AccessibleListItem
              key={chain.id}
              value={chain.id.toString()}
              asChild
            >
              <Button
                color="ghost"
                css={{
                  scrollSnapAlign: 'start',
                  minHeight: 'auto',
                  gap: '2',
                  cursor: 'pointer',
                  px: '2',
                  py: '2',
                  transition: 'backdrop-filter 250ms linear',
                  _hover: {
                    backgroundColor: 'gray/10'
                  },
                  flexShrink: 0,
                  alignContent: 'center',
                  display: 'flex',
                  width: '100%',
                  '--focusColor': 'colors.focus-color',
                  _focusVisible: {
                    boxShadow: 'inset 0 0 0 2px var(--focusColor)'
                  },
                  '&[data-state="on"]': {
                    boxShadow: 'inset 0 0 0 2px var(--focusColor)'
                  },
                  _active: {
                    boxShadow: 'inset 0 0 0 2px var(--focusColor)'
                  },
                  _focusWithin: {
                    boxShadow: 'inset 0 0 0 2px var(--focusColor)'
                  }
                }}
              >
                <Flex css={{ gap: '2', alignItems: 'center' }}>
                  <ChainIcon
                    chainId={chain.id}
                    width={24}
                    height={24}
                    css={{ borderRadius: 4, overflow: 'hidden' }}
                  />
                  <Flex direction="column" align="start">
                    <Text style="subtitle1">{chain.displayName}</Text>
                    {type === 'token' ? (
                      <Text style="subtitle3" color="subtle">
                        {truncateAddress(chain?.currency?.address)}
                      </Text>
                    ) : null}
                  </Flex>
                </Flex>

                {chain?.currency?.balance?.amount ? (
                  <Text css={{ ml: 'auto' }} style="subtitle3" color="subtle">
                    {formatBN(
                      BigInt(chain?.currency?.balance?.amount),
                      5,
                      decimals,
                      compactBalance
                    )}
                  </Text>
                ) : null}
              </Button>
            </AccessibleListItem>
          )
        })}
      </AccessibleList>
    </>
  )
}
