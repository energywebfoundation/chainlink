import React from 'react'
import { RouteComponentProps } from '@reach/router'
import {
  createStyles,
  // Theme,
  withStyles,
  WithStyles,
} from '@material-ui/core/styles'
// import { SignInForm } from '@chainlink/styleguide'

const styles = () => createStyles({})

interface Props extends RouteComponentProps, WithStyles<typeof styles> {}

/* eslint-disable-next-line no-empty-pattern */
export const Admin = ({  }: Props) => {
  return (
    <div>
      <h1>Admin</h1>

      <div>USE SIGN IN FORM HERE!!!!</div>
    </div>
  )
}

export default withStyles(styles)(Admin)
