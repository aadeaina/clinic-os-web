from django.core.management.base import BaseCommand
from core.models import Clinic


class Command(BaseCommand):
    help = "Seed a demo clinic."

    def handle(self, *args, **opts):
        clinic, created = Clinic.objects.get_or_create(name="Cedar Park Family Clinic")
        self.stdout.write(self.style.SUCCESS(f"Clinic id: {clinic.id} ({'created' if created else 'exists'})"))
