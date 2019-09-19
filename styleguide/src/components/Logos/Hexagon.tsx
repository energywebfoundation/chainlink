import React from 'react'
import { Logo } from '../Logo'
// import src from './icon-logo-blue.svg'

interface Props {
  width?: number
  height?: number
  alt?: string
}

export const HexagonLogo = (props: Props) => {
  // TODO: Get src working as an export via TS
  // return <Logo src={src} {...props} />
  return <Logo src={'/'} {...props} />
}
