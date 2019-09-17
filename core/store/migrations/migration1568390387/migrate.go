package migration1568390387

import (
	"github.com/jinzhu/gorm"
	"github.com/pkg/errors"
)

// Migrate amends the encumbrances table to include the aggregator contact details
func Migrate(tx *gorm.DB) error {
	if err := tx.Exec(
		`ALTER TABLE encumbrances ADD COLUMN "aggregator"                VARCHAR(40);
     ALTER TABLE encumbrances ADD COLUMN "agg_initiate_job_selector" BYTEA[4];
     ALTER TABLE encumbrances ADD COLUMN "agg_fulfill_selector"      BYTEA[4];`,
	).Error; err != nil {
		return errors.Wrap(err, "failed to automigrate encumbrances to include aggregator info")
	}
	return nil
}
