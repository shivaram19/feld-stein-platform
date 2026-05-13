import { Customer } from "@prisma/client"

declare global {
  namespace Express {
    interface Request {
      customer?: Customer
    }
  }
}

export {}
