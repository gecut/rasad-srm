const formatter = new Intl.DateTimeFormat('fa-IR-u-ca-persian', {
  dateStyle: 'full',
  timeStyle: 'short',
  timeZone: 'Asia/Tehran',
})
export const formatDate = (value: string) => formatter.format(new Date(value))
