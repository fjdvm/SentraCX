using Crm.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Crm.Api.Data.Configurations;

public class CampaignConfiguration : IEntityTypeConfiguration<Campaign>
{
    public void Configure(EntityTypeBuilder<Campaign> builder)
    {
        builder.ToTable("campaigns");

        builder.HasKey(c => c.Id);
        builder.Property(c => c.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.Property(c => c.Title).IsRequired().HasMaxLength(200);
        builder.Property(c => c.Subject).IsRequired().HasMaxLength(200);
        builder.Property(c => c.Description).IsRequired().HasColumnType("text");
        builder.Property(c => c.Channels).IsRequired();
        builder.Property(c => c.TargetAudience).IsRequired().HasMaxLength(50).HasDefaultValue("All");
        builder.Property(c => c.TargetCustomerIds);
        builder.Property(c => c.TargetEmails);
        builder.Property(c => c.Status).IsRequired().HasMaxLength(50).HasDefaultValue("Draft");
        builder.Property(c => c.ImageUrl).HasMaxLength(500);

        builder.Property(c => c.CreatedById).IsRequired().HasMaxLength(128);
        builder.Property(c => c.CreatedAt).HasDefaultValueSql("now()");

        builder.HasOne(c => c.CreatedBy)
            .WithMany(u => u.Campaigns)
            .HasForeignKey(c => c.CreatedById)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne(c => c.Template)
            .WithMany(t => t.Campaigns)
            .HasForeignKey(c => c.TemplateId)
            .OnDelete(DeleteBehavior.SetNull);

        builder.HasMany(c => c.MarketingInteractions)
            .WithOne(mi => mi.Campaign)
            .HasForeignKey(mi => mi.CampaignId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
