import { useEffect, useState } from 'react'
import { Chip } from '@heroui/react'
import { StopwatchIcon } from '../components/icons'

export function InvitationTimer({
  expiresAt,
  onExpire,
}: {
  expiresAt: string
  onExpire?: () => void
}) {
  const [remaining, setRemaining] = useState<number>(() =>
    Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)),
  )

  useEffect(() => {
    const calculateRemaining = () =>
      Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000))

    setRemaining(calculateRemaining())

    const interval = setInterval(() => {
      const left = calculateRemaining()
      setRemaining(left)
      if (left <= 0) {
        clearInterval(interval)
        onExpire?.()
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [expiresAt, onExpire])

  const minutes = Math.floor(remaining / 60)
  const seconds = remaining % 60
  const formatted = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  const isExpired = remaining <= 0
  const isDanger = remaining > 0 && remaining <= 10
  const isWarning = remaining > 10 && remaining <= 60

  const color: 'accent' | 'warning' | 'danger' = isExpired || isDanger
    ? 'danger'
    : isWarning
      ? 'warning'
      : 'accent'
  const pulseClass = isDanger ? 'animate-pulse' : ''

  return (
    <Chip
      size="sm"
      color={color}
      variant="soft"
      className={`font-mono text-xs flex items-center gap-1 ${pulseClass}`}
    >
      <StopwatchIcon className="size-3.5 inline-block ml-1" />
      <span>{isExpired ? 'مهلت منقضی شد' : formatted}</span>
    </Chip>
  )
}
