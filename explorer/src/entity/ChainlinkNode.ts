import {
  Column,
  Connection,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm'
import { MinLength } from 'class-validator'
import { JobRun } from './JobRun'
import { sha256 } from 'js-sha256'
import { randomBytes } from 'crypto'

export interface ChainlinkNodePresenter {
  id: number
  name: string
}

@Entity()
@Unique(['name'])
export class ChainlinkNode {
  public static build({
    name,
    url,
    secret,
  }: {
    name: string
    url?: string
    secret: string
  }): ChainlinkNode {
    const cl = new ChainlinkNode()
    cl.name = name
    cl.url = url
    cl.accessKey = generateRandomString(16)
    cl.salt = generateRandomString(32)
    cl.hashedSecret = hashCredentials(cl.accessKey, secret, cl.salt)
    return cl
  }

  @PrimaryGeneratedColumn()
  id: number

  @MinLength(3, { message: 'must be at least 3 characters' })
  @Column()
  name: string

  @Column({ nullable: true })
  url: string

  @Column()
  accessKey: string

  @Column()
  hashedSecret: string

  @Column()
  salt: string

  @OneToMany(() => JobRun, jobRun => jobRun.chainlinkNode, {
    onDelete: 'CASCADE',
  })
  jobRuns: Array<JobRun>

  public present(): ChainlinkNodePresenter {
    return {
      id: this.id,
      name: this.name,
    }
  }
}

function generateRandomString(size: number): string {
  return randomBytes(size)
    .toString('base64')
    .replace(/[/+=]/g, '')
    .substring(0, size)
}

export const buildChainlinkNode = (
  db: Connection,
  name: string,
  url?: string,
): [ChainlinkNode, string] => {
  const secret = generateRandomString(64)
  const node = ChainlinkNode.build({ name, url, secret })

  return [node, secret]
}

export const createChainlinkNode = async (
  db: Connection,
  name: string,
  url?: string,
): Promise<[ChainlinkNode, string]> => {
  const secret = generateRandomString(64)
  const chainlinkNode = ChainlinkNode.build({ name, url, secret })
  return [await db.manager.save(chainlinkNode), secret]
}

export const deleteChainlinkNode = async (db: Connection, name: string) => {
  return db.manager
    .createQueryBuilder()
    .delete()
    .from(ChainlinkNode)
    .where('name = :name', {
      name: name,
    })
    .execute()
}

export function hashCredentials(
  accessKey: string,
  secret: string,
  salt: string,
): string {
  return sha256(`v0-${accessKey}-${secret}-${salt}`)
}

export async function find(db: Connection, id: number): Promise<ChainlinkNode> {
  return db.getRepository(ChainlinkNode).findOne({ id: id })
}
