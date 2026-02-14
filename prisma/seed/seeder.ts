import { prisma } from '@/lib/prisma';

async function seeder() {
  console.log('🌱 Seeding database...');

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
