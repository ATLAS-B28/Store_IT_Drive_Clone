import { cn, formatDateTime } from '@/lib/utils'
import React from 'react'

const FormattedDataTime = (
    {
        date, 
        className
    }: {
        date: string, 
        className?: string
    }
) => {
        
  return (
    <p className={cn('body-1 text-lime-100', className)}>
        {formatDateTime(date)}
    </p>
  )
}

export default FormattedDataTime