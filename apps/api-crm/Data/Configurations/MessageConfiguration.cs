using Crm.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Crm.Api.Data.Configurations;

public class MessageConfiguration : IEntityTypeConfiguration<Message>
{
    public void Configure(EntityTypeBuilder<Message> builder)
    {
        builder.ToTable("messages");

        builder.HasKey(m => m.Id);
        builder.Property(m => m.Id).HasDefaultValueSql("gen_random_uuid()");

        builder.Property(m => m.TicketId).IsRequired();
        builder.Property(m => m.SenderId).IsRequired().HasMaxLength(128);
        builder.Property(m => m.Content).IsRequired().HasColumnType("text");
        builder.Property(m => m.IsRead).HasDefaultValue(false);
        builder.Property(m => m.SentAt).IsRequired();

        builder.HasIndex(m => m.TicketId);

        builder.HasOne(m => m.Sender)
            .WithMany()
            .HasForeignKey(m => m.SenderId)
            .IsRequired(false);
    }
}
