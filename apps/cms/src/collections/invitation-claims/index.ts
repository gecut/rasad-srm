import type { CollectionConfig } from 'payload'

export const InvitationClaims: CollectionConfig = {
  slug: 'invitation-claims',
  admin: { hidden: true },
  access: { read: () => false, create: () => false, update: () => false, delete: () => false },
  indexes: [
    { fields: ['student', 'ceremony'], unique: true },
    { fields: ['inviter', 'ceremony'], unique: true },
  ],
  fields: [
    {
      name: 'ceremony',
      type: 'relationship',
      relationTo: 'ceremonies',
      required: true,
      index: true,
    },
    { name: 'session', type: 'relationship', relationTo: 'sessions', required: true },
    { name: 'student', type: 'relationship', relationTo: 'students', required: true },
    { name: 'inviter', type: 'relationship', relationTo: 'users', required: true },
    { name: 'token', type: 'text', required: true, unique: true },
    { name: 'expiresAt', type: 'date', required: true, index: true },
  ],
}
