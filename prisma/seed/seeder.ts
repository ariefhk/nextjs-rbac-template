import { prisma } from '@/lib/prisma';
import { userSeed } from './user-seed';

async function seeder() {
  console.log('🌱 Seeding database...');

  await userSeed();

  console.log('✅ Database seeded successfully!');
}

seeder()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
