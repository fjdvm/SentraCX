using Crm.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Crm.Api.Data.Configurations;

public class MarketingInteractionConfiguration : IEntityTypeConfiguration<MarketingInteraction>
{
    public void Configure(EntityTypeBuilder<MarketingInteraction> builder)
    {
        builder.ToTable("marketing_interactions");

        builder.HasKey(mi => mi.Id);
        builder.Property(mi => mi.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.Property(mi => mi.CustomerId).IsRequired();
        builder.Property(mi => mi.CampaignId);
        builder.Property(mi => mi.InteractionSource).IsRequired().HasMaxLength(50);
        builder.Property(mi => mi.Title).IsRequired().HasMaxLength(200);
        builder.Property(mi => mi.Description).IsRequired().HasColumnType("text");
        builder.Property(mi => mi.Channel).IsRequired().HasMaxLength(50);
        builder.Property(mi => mi.InteractionType).IsRequired().HasMaxLength(50);
        builder.Property(mi => mi.IsSuccess).HasDefaultValue(true);
        builder.Property(mi => mi.SentAt).HasDefaultValueSql("now()");

        builder.HasOne(mi => mi.CustomerProfile)
            .WithMany()
            .HasForeignKey(mi => mi.CustomerId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasOne(mi => mi.Campaign)
            .WithMany(c => c.MarketingInteractions)
            .HasForeignKey(mi => mi.CampaignId)
            .OnDelete(DeleteBehavior.SetNull);
    }
}
