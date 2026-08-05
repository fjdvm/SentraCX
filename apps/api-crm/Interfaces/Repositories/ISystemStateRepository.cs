using System.Threading.Tasks;

namespace Crm.Api.Interfaces.Repositories;

public interface ISystemStateRepository
{
    Task<object> GetGlobalSnapshotAsync();
}
