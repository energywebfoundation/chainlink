import React from 'react'
import {
  createStyles,
  withStyles,
  WithStyles,
  Theme,
} from '@material-ui/core/styles'
import { Grid } from '@material-ui/core'
import Card from '@material-ui/core/Card'
import CardContent from '@material-ui/core/CardContent'
import Typography from '@material-ui/core/Typography'
// import TextField from '@material-ui/core/TextField'
import { HexagonLogo } from '../Logos/Hexagon'

const styles = ({ spacing, palette }: Theme) =>
  createStyles({
    container: {
      height: '100%',
    },
    cardContent: {
      paddingTop: spacing.unit * 6,
      paddingLeft: spacing.unit * 4,
      paddingRight: spacing.unit * 4,
      '&:last-child': {
        paddingBottom: spacing.unit * 6,
      },
    },
    headerRow: {
      textAlign: 'center',
    },
    error: {
      backgroundColor: palette.error.light,
      marginTop: spacing.unit * 2,
    },
    errorText: {
      color: palette.error.main,
    },
  })

interface Props extends WithStyles<typeof styles> {
  onSubmit: () => void
}

// TODO: ERRORS
// TODO: TEXT FIELDS
export const SignInForm = withStyles(styles)(({ classes, onSubmit }: Props) => {
  return (
    <Grid
      container
      justify="center"
      alignItems="center"
      className={classes.container}
      spacing={0}
    >
      <Grid item xs={10} sm={6} md={4} lg={3} xl={2}>
        <Card>
          <CardContent className={classes.cardContent}>
            <form noValidate onSubmit={onSubmit}>
              <Grid container spacing={8}>
                <Grid item xs={12}>
                  <Grid container spacing={0}>
                    <Grid item xs={12} className={classes.headerRow}>
                      <HexagonLogo width={50} />
                    </Grid>
                    <Grid item xs={12} className={classes.headerRow}>
                      <Typography variant="h5">Explorer Admin</Typography>
                    </Grid>
                  </Grid>
                </Grid>
              </Grid>
            </form>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  )
})

export default SignInForm
