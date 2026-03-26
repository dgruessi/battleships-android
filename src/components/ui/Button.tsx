import { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'
import './Button.css'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger'
  children: ReactNode
}

export default function Button({ variant = 'primary', className, children, ...rest }: ButtonProps) {
  return (
    <button type="button" className={cn('btn', `btn-${variant}`, className)} {...rest}>
      {children}
    </button>
  )
}
